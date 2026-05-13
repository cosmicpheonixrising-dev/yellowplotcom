import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Character, Relationship } from '../types';

interface RelationshipGraphProps {
  characters: Character[];
  relationships: Relationship[];
}

export default function RelationshipGraph({ characters, relationships }: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || characters.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = 600;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    svg.selectAll('*').remove();

    // Data transformation
    const nodes = characters.map(c => ({ id: c.id, name: c.name, role: c.role }));
    const links = relationships.map(r => ({
      source: r.sourceId,
      target: r.targetId,
      type: r.type,
      strength: r.strength
    })).filter(l => 
      nodes.find(n => n.id === l.source) && nodes.find(n => n.id === l.target)
    );

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    // Define Arrowheads
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 30)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#f59e0b')
      .style('stroke', 'none');

    // Draw Links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#fbbf24')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', (d: any) => Math.max(1, d.strength / 2))
      .attr('marker-end', 'url(#arrowhead)');

    // Draw Link Labels
    const linkLabel = svg.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-size', '8px')
      .attr('font-weight', '900')
      .attr('text-anchor', 'middle')
      .attr('fill', '#d97706')
      .attr('class', 'uppercase tracking-tighter pointer-events-none')
      .text((d: any) => d.type);

    // Draw Nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    node.append('circle')
      .attr('r', 24)
      .attr('fill', '#fff')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('class', 'shadow-sm');

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1e293b')
      .text((d: any) => d.name.split(' ')[0]);

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '2.5em')
      .attr('font-size', '7px')
      .attr('font-weight', '900')
      .attr('fill', '#94a3b8')
      .attr('class', 'uppercase tracking-widest')
      .text((d: any) => d.role);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 5);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [characters, relationships]);

  return (
    <div ref={containerRef} className="w-full bg-slate-50/30 rounded-[40px] border border-slate-100 overflow-hidden relative shadow-inner">
      <div className="absolute top-6 left-8 z-10">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fate Weaver Engine</h4>
        <p className="text-[8px] font-bold text-amber-500 uppercase mt-1">Real-time Thread Mapping</p>
      </div>
      <svg ref={svgRef} className="cursor-grab active:cursor-grabbing w-full h-[600px]" />
    </div>
  );
}
